using Secs4Net;
using SecsGemDemo.Equipment.Handlers;

namespace SecsGemDemo.Equipment.Services;

public sealed class MessageRouter(
    S1F13Handler s1F13,
    S2F33Handler s2F33,
    S2F35Handler s2F35,
    S2F37Handler s2F37,
    S2F41Handler s2F41)
{
    public Task RouteAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg = e.PrimaryMessage;
        return (msg.S, msg.F) switch
        {
            (1, 13) => s1F13.HandleAsync(e, ct),
            (2, 33) => s2F33.HandleAsync(e, ct),
            (2, 35) => s2F35.HandleAsync(e, ct),
            (2, 37) => s2F37.HandleAsync(e, ct),
            (2, 41) => s2F41.HandleAsync(e, ct),
            _ => HandleUnknownAsync(e, ct)
        };
    }

    private static async Task HandleUnknownAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg = e.PrimaryMessage;
        Serilog.Log.Warning("[ROUTER] Unhandled S{S}F{F}", msg.S, msg.F);
        if (msg.ReplyExpected)
        {
            var reply = new SecsMessage(msg.S, (byte)(msg.F + 1), replyExpected: false);
            await e.TryReplyAsync(reply, ct);
        }
    }
}
