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
        if (msg.S == 6 && msg.F == 11)
        {
            await HandleS6F11Async(msg, e, ct);
            return;
        }

        Serilog.Log.Warning("[HOST] Unhandled incoming S{S}F{F}", msg.S, msg.F);
        if (msg.ReplyExpected)
        {
            var reply = new SecsMessage(msg.S, (byte)(msg.F + 1), replyExpected: false);
            await e.TryReplyAsync(reply, ct);
        }
    }

    private async Task HandleS6F11Async(SecsMessage msg, PrimaryMessageWrapper e, CancellationToken ct)
    {
        var root = msg.SecsItem!;
        var ceid = root.Items[1].FirstValue<uint>();

        var s6f12 = new SecsMessage(6, 12, replyExpected: false)
        {
            Name = "Event Report Ack",
            SecsItem = B(0x00)
        };
        await e.TryReplyAsync(s6f12, ct);

        // broadcast the incoming event to SignalR clients
        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "E→H", msg.S, msg.F,
            $"Event Report CEID={ceid}",
            FormatSml(msg),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        Serilog.Log.Information("[HOST] S6F11 received CEID={Ceid}", ceid);

        var reportItems = root.Items[2].Items;

        if (ceid == CeidCatalog.CarrierArrived)
        {
            var lotId = ExtractFirstDvString(reportItems, 0) ?? masterData.Lot.LotId;
            var (_, validMsg) = validation.ValidateCarrierArrived(lotId);
            Serilog.Log.Information("[VALIDATION] Carrier arrived: {Msg}", validMsg);
        }
        else if (ceid == CeidCatalog.ProcessStart)
        {
            var lotId = ExtractFirstDvString(reportItems, 0) ?? "";
            var ppid  = ExtractFirstDvString(reportItems, 1) ?? "";
            var start = ExtractFirstDvString(reportItems, 2) ?? DateTime.UtcNow.ToString("o");
            masterData.RecordTrackIn(lotId, ppid, start);
            Serilog.Log.Information("[SCENARIO] Step 5: Track-In LOT={LotId} PPID={Ppid}", lotId, ppid);

            stateTracker.SetProcess("Executing");
            await broadcaster.BroadcastStateAsync(
                new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
        }
        else if (ceid == CeidCatalog.ProcessEnd)
        {
            var lotId   = ExtractFirstDvString(reportItems, 0) ?? "";
            var endTime = ExtractFirstDvString(reportItems, 2) ?? DateTime.UtcNow.ToString("o");
            var result  = ExtractFirstDvString(reportItems, 3) ?? "PASS";
            masterData.RecordTrackOut(lotId, endTime, result);
            Serilog.Log.Information("[SCENARIO] Step 8: Track-Out LOT={LotId} Result={Result}", lotId, result);

            stateTracker.SetProcess("Idle");
            await broadcaster.BroadcastStateAsync(
                new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
        }
        else if (ceid == CeidCatalog.Trace)
        {
            var temp     = ExtractFirstDvString(reportItems, 0);
            var gasFlow  = ExtractFirstDvString(reportItems, 1);
            var pressure = ExtractFirstDvString(reportItems, 2);
            Serilog.Log.Information("[TRACE] Temp={Temp} GasFlow={GasFlow} Pressure={Pressure}",
                temp, gasFlow, pressure);
        }
    }

    private static string? ExtractFirstDvString(IReadOnlyList<Item> reportItems, int dvIndex)
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
