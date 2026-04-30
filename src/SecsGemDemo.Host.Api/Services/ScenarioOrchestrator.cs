using Secs4Net;
using SecsGemDemo.Domain.Catalogs;
using SecsGemDemo.Host.Api.Dtos;
using static Secs4Net.Item;

namespace SecsGemDemo.Host.Api.Services;

public sealed class ScenarioOrchestrator(
    ISecsGem secsGem,
    ISecsConnection hsmsConnection,
    ValidationEngine validation,
    MessageBroadcaster broadcaster,
    GemStateTracker stateTracker)
{
    private const uint DataId = 9001;

    public async Task ConnectAsync(CancellationToken ct)
    {
        hsmsConnection.Start(ct);
        var deadline = DateTime.UtcNow.AddSeconds(15);
        while (hsmsConnection.State != ConnectionState.Selected && DateTime.UtcNow < deadline)
            await Task.Delay(200, ct);

        if (hsmsConnection.State != ConnectionState.Selected)
            throw new InvalidOperationException("HSMS connection did not reach Selected state");

        var s1f13 = new SecsMessage(1, 13, replyExpected: true)
        {
            Name = "Establish Communication",
            SecsItem = L(L())
        };
        var s1f14 = await SendAndLogAsync(s1f13, ct);
        Serilog.Log.Information("[SCENARIO] Step 1: Connected COMMACK={Ack}",
            s1f14.SecsItem?.Items[0].FirstValue<byte>());

        stateTracker.SetComm("Communicating");
        await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
    }

    public async Task DefineReportsAsync(CancellationToken ct)
    {
        await SendDefineReportAsync(1001,
            [DvidCatalog.LotId, DvidCatalog.Ppid, DvidCatalog.StartTime], ct);

        await SendDefineReportAsync(1002,
            [DvidCatalog.LotId, DvidCatalog.WaferCount, DvidCatalog.EndTime, DvidCatalog.Result], ct);

        await SendDefineReportAsync(1003,
            [SvidCatalog.ChamberTemp, SvidCatalog.GasFlow, SvidCatalog.Pressure], ct);

        await SendLinkEventAsync(CeidCatalog.ProcessStart, [1001], ct);
        await SendLinkEventAsync(CeidCatalog.ProcessEnd,   [1002], ct);
        await SendLinkEventAsync(CeidCatalog.Trace,        [1003], ct);

        await SendEnableEventsAsync(
            [CeidCatalog.CarrierArrived, CeidCatalog.ProcessStart, CeidCatalog.ProcessEnd, CeidCatalog.Trace],
            ct);

        Serilog.Log.Information("[SCENARIO] Step 2: Define Reports complete");
    }

    private async Task SendDefineReportAsync(uint rptId, uint[] dvids, CancellationToken ct)
    {
        var s2f33 = new SecsMessage(2, 33, replyExpected: true)
        {
            Name = $"Define Report RPTID={rptId}",
            SecsItem = L(U4(DataId), L(L(U4(rptId), L(dvids.Select(d => U4(d))))))
        };
        var s2f34 = await SendAndLogAsync(s2f33, ct);
        Serilog.Log.Information("[SCENARIO] S2F34 DRACK={Ack} RPTID={RptId}",
            s2f34.SecsItem?.FirstValue<byte>(), rptId);
    }

    private async Task SendLinkEventAsync(uint ceid, uint[] rptIds, CancellationToken ct)
    {
        var s2f35 = new SecsMessage(2, 35, replyExpected: true)
        {
            Name = $"Link Event CEID={ceid}",
            SecsItem = L(U4(DataId), L(L(U4(ceid), L(rptIds.Select(r => U4(r))))))
        };
        var s2f36 = await SendAndLogAsync(s2f35, ct);
        Serilog.Log.Information("[SCENARIO] S2F36 LRACK={Ack} CEID={Ceid}",
            s2f36.SecsItem?.FirstValue<byte>(), ceid);
    }

    private async Task SendEnableEventsAsync(uint[] ceids, CancellationToken ct)
    {
        var s2f37 = new SecsMessage(2, 37, replyExpected: true)
        {
            Name = "Enable Event Reports",
            SecsItem = L(B(0x01), L(ceids.Select(c => U4(c))))
        };
        var s2f38 = await SendAndLogAsync(s2f37, ct);
        Serilog.Log.Information("[SCENARIO] S2F38 ERACK={Ack}", s2f38.SecsItem?.FirstValue<byte>());
    }

    public async Task SelectRecipeAsync(string ppid, CancellationToken ct)
    {
        var (ok, msg) = validation.ValidateRecipe(ppid);
        if (!ok) throw new InvalidOperationException(msg);

        var s2f41 = new SecsMessage(2, 41, replyExpected: true)
        {
            Name = "PP-SELECT",
            SecsItem = L(A(HostCommandCatalog.PpSelect), L(L(A("PPID"), A(ppid))))
        };
        var s2f42 = await SendAndLogAsync(s2f41, ct);
        Serilog.Log.Information("[SCENARIO] Step 4: S2F42 HCACK={Ack}",
            s2f42.SecsItem?.Items[0].FirstValue<byte>());

        stateTracker.SetProcess("Ready");
        await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);
    }

    public async Task DisconnectAsync(CancellationToken ct)
    {
        stateTracker.SetComm("NotCommunicating");
        stateTracker.SetProcess("Idle");
        await broadcaster.BroadcastStateAsync(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState), ct);

        if (hsmsConnection is IAsyncDisposable disposable)
            await disposable.DisposeAsync();
    }

    private async Task<SecsMessage> SendAndLogAsync(SecsMessage msg, CancellationToken ct)
    {
        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "H→E", msg.S, msg.F,
            msg.Name ?? $"S{msg.S}F{msg.F}",
            FormatSml(msg),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        var reply = await secsGem.SendAsync(msg, ct);

        await broadcaster.BroadcastMessageAsync(new SecsMessageDto(
            "E→H", reply.S, reply.F,
            reply.Name ?? $"S{reply.S}F{reply.F}",
            FormatSml(reply),
            DateTime.UtcNow.ToString("HH:mm:ss.fff")), ct);

        return reply;
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
