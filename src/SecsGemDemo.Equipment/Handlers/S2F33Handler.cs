using Secs4Net;
using SecsGemDemo.Equipment.Services;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Handlers;

public sealed class S2F33Handler(ReportRegistry registry)
{
    public async Task HandleAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg = e.PrimaryMessage;
        var root = msg.SecsItem;

        // S2F33: L[DATAID, L[L[RPTID, L[VID...]]...]]
        // root.Items[0] = DATAID, root.Items[1] = L of report defs
        var reportDefs = root!.Items[1];

        foreach (var rptDef in reportDefs.Items)
        {
            var rptId = rptDef.Items[0].FirstValue<uint>();
            var vids  = rptDef.Items[1].Items.Select(v => v.FirstValue<uint>()).ToList();
            registry.DefineReport(rptId, vids);
        }

        var reply = new SecsMessage(2, 34, replyExpected: false)
        {
            Name = "Define Report Ack",
            SecsItem = B(0x00)   // DRACK=0 (ACK)
        };
        await e.TryReplyAsync(reply, ct);
    }
}
