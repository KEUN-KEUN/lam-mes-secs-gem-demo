using Secs4Net;
using SecsGemDemo.Equipment.Services;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Handlers;

public sealed class S2F37Handler(ReportRegistry registry)
{
    public async Task HandleAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg  = e.PrimaryMessage;
        var root = msg.SecsItem;

        // S2F37: L[CEED, L[CEID...]]
        // CEED: 0=disable, 1=enable
        var ceed   = root!.Items[0].FirstValue<byte>() != 0;
        var ceids  = root.Items[1].Items.Select(c => c.FirstValue<uint>()).ToList();

        registry.EnableCeids(ceids, ceed);

        Serilog.Log.Information("[HANDLER] S2F37 Enable={Enable} CEIDs=[{Ceids}]",
            ceed, string.Join(",", ceids));

        var reply = new SecsMessage(2, 38, replyExpected: false)
        {
            Name = "Enable Event Report Ack",
            SecsItem = B(0x00)   // ERACK=0 (ACK)
        };
        await e.TryReplyAsync(reply, ct);
    }
}
