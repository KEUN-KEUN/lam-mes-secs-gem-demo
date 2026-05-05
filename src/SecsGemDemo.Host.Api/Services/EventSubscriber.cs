using Secs4Net;
using SecsGemDemo.Domain.Catalogs;
using SecsGemDemo.Host.Api.Dtos;
using static Secs4Net.Item;

namespace SecsGemDemo.Host.Api.Services;

public sealed class EventSubscriber(
    ISecsGem secsGem,
    MasterDataStore masterData,
    ValidationEngine validation,
    MessageBroadcaster broadcaster,
    GemStateTracker stateTracker) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var e in secsGem.GetPrimaryMessageAsync(stoppingToken))
        {
            using var msg = e.PrimaryMessage;
            try
            {
                await HandleAsync(msg, e, stoppingToken);
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "[HOST] Error handling incoming S{S}F{F}", msg.S, msg.F);
            }
        }
    }

    private async Task HandleAsync(SecsMessage msg, PrimaryMessageWrapper e, CancellationToken ct)
    {
        switch (msg.S, msg.F)
        {
            case (6, 11): await HandleS6F11Async(msg, e, ct); break;
            case (5, 1):  await HandleS5F1Async(msg, e, ct);  break;
            default:
                Serilog.Log.Warning("[HOST] Unhandled incoming S{S}F{F}", msg.S, msg.F);
                if (msg.ReplyExpected)
                    await e.TryReplyAsync(new SecsMessage(msg.S, (byte)(msg.F + 1), replyExpected: false), ct);
                break;
        }
    }

    // S6F11: Event Report (Equipment → Host)
    private async Task HandleS6F11Async(SecsMessage msg, PrimaryMessageWrapper e, CancellationToken ct)
    {
        // S6F12 reply를 먼저 전송 — Equipment의 secsGem.SendAsync 블로킹 즉시 해제
        var s6f12 = new SecsMessage(6, 12, replyExpected: false)
        {
            Name = "Event Report Ack",
            SecsItem = B(0x00)
        };
        await e.TryReplyAsync(s6f12, ct);

        var root = msg.SecsItem!;
        var ceid = root.Items[1].FirstValue<uint>();

        Serilog.Log.Information("[HOST] S6F11 CEID={Ceid}", ceid);

        // reply 전송 후 로그 (순서 역전 방지)
        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "E→H", msg.S, msg.F,
            $"Event Report CEID={ceid}",
            FormatSml(msg),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "H→E", s6f12.S, s6f12.F,
            s6f12.Name,
            FormatSml(s6f12),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        var reportItems = root.Items[2].Items;

        if (ceid == CeidCatalog.CarrierArrived)
        {
            var lotId = ExtractDvString(reportItems, 0) ?? masterData.Lot.LotId;
            var (_, validMsg) = validation.ValidateCarrierArrived(lotId);
            Serilog.Log.Information("[VALIDATION] Carrier arrived: {Msg}", validMsg);
        }
        else if (ceid == CeidCatalog.ProcessStart)
        {
            var lotId = ExtractDvString(reportItems, 0) ?? "";
            var ppid  = ExtractDvString(reportItems, 1) ?? "";
            var start = ExtractDvString(reportItems, 2) ?? DateTime.UtcNow.ToString("o");

            masterData.RecordTrackIn(lotId, ppid, start);
            Serilog.Log.Information("[SCENARIO] Track-In LOT={LotId} PPID={Ppid}", lotId, ppid);

            stateTracker.SetProcess("Executing");
            await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
            await broadcaster.BroadcastLotHistoryAsync(
                new LotHistoryDto(lotId, ppid, start, null, null, masterData.Lot.WaferCount), ct);
        }
        else if (ceid == CeidCatalog.ProcessEnd)
        {
            var lotId   = ExtractDvString(reportItems, 0) ?? "";
            var endTime = ExtractDvString(reportItems, 2) ?? DateTime.UtcNow.ToString("o");
            var result  = ExtractDvString(reportItems, 3) ?? "PASS";

            masterData.RecordTrackOut(lotId, endTime, result);
            Serilog.Log.Information("[SCENARIO] Track-Out LOT={LotId} Result={Result}", lotId, result);

            stateTracker.SetProcess("Idle");
            await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);

            var history = masterData.GetHistory(lotId);
            if (history is not null)
                await broadcaster.BroadcastLotHistoryAsync(
                    new LotHistoryDto(lotId, history.Ppid, history.StartTime, endTime, result, masterData.Lot.WaferCount), ct);
        }
        else if (ceid == CeidCatalog.Trace)
        {
            var temp     = ExtractDvString(reportItems, 0) ?? "0";
            var gasFlow  = ExtractDvString(reportItems, 1) ?? "0";
            var pressure = ExtractDvString(reportItems, 2) ?? "0";

            await broadcaster.BroadcastTraceAsync(
                new TraceDataDto(temp, gasFlow, pressure, DateTime.UtcNow.ToString("HH:mm:ss")), ct);
        }
    }

    // S5F1: Alarm Report (Equipment → Host)
    private async Task HandleS5F1Async(SecsMessage msg, PrimaryMessageWrapper e, CancellationToken ct)
    {
        var root      = msg.SecsItem!;
        var alcd      = root.Items[0].FirstValue<byte>();
        var alarmId   = root.Items[1].FirstValue<uint>();
        var alarmText = root.Items[2].GetString() ?? "";
        var isSet     = (alcd & 0x80) != 0;
        var action    = isSet ? "SET" : "CLEAR";

        Serilog.Log.Information("[ALARM] S5F1 {Action} ALID={Id} Text={Text}", action, alarmId, alarmText);

        // S5F2 reply를 먼저 전송 — Equipment의 secsGem.SendAsync 블로킹 즉시 해제
        var s5f2 = new SecsMessage(5, 2, replyExpected: false)
        {
            Name = "Alarm Report Ack",
            SecsItem = B(0x00)
        };
        await e.TryReplyAsync(s5f2, ct);

        // reply 전송 후 로그
        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "E→H", msg.S, msg.F,
            $"Alarm {action} ALID={alarmId}",
            FormatSml(msg),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "H→E", s5f2.S, s5f2.F,
            s5f2.Name,
            FormatSml(s5f2),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        await broadcaster.BroadcastAlarmAsync(
            new AlarmDto(alarmId, alarmText, isSet, DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        stateTracker.SetProcess(isSet ? "Pause" : "Executing");
        await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
    }

    private static string? ExtractDvString(IReadOnlyList<Item> reportItems, int dvIndex)
    {
        if (reportItems.Count == 0) return null;
        var firstRpt = reportItems[0];
        if (firstRpt.Items.Length < 2) return null;
        var vars = firstRpt.Items[1].Items;
        return dvIndex < vars.Length ? vars[dvIndex].GetString() : null;
    }

    private static string FormatSml(SecsMessage msg)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append($"S{msg.S}F{msg.F}");
        if (msg.ReplyExpected) sb.Append(" W");
        sb.AppendLine();
        sb.Append(msg.SecsItem?.ToString() ?? "< >");
        return sb.ToString();
    }
}
