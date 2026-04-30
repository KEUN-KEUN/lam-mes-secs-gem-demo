using Secs4Net;
using SecsGemDemo.Equipment.Services;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Handlers;

public sealed class S2F35Handler(ReportRegistry registry)
{
    public async Task HandleAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg  = e.PrimaryMessage;
        var root = msg.SecsItem;

        // S2F35: L[DATAID, L[L[CEID, L[RPTID...]]...]]
        var linkDefs = root!.Items[1];

        foreach (var linkDef in linkDefs.Items)
        {
            var ceid   = linkDef.Items[0].FirstValue<uint>();
            var rptIds = linkDef.Items[1].Items.Select(r => r.FirstValue<uint>()).ToList();
            registry.LinkEvent(ceid, rptIds);
        }

        var reply = new SecsMessage(2, 36, replyExpected: false)
        {
            Name = "Link Event Report Ack",
            SecsItem = B(0x00)   // LRACK=0 (ACK)
        };
        await e.TryReplyAsync(reply, ct);
    }
}
