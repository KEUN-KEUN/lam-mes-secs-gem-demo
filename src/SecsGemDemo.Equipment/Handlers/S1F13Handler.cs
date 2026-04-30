using Secs4Net;
using SecsGemDemo.Equipment.Services;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Handlers;

public sealed class S1F13Handler(GemStateMachine stateMachine)
{
    public async Task HandleAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        Serilog.Log.Information("[HANDLER] S1F13 Establish Communication");

        var reply = new SecsMessage(1, 14, replyExpected: false)
        {
            Name = "Establish Communication Ack",
            SecsItem = L(B(0x00), L())   // COMMACK=0 (ACK), MDLN/SOFTREV empty
        };

        await e.TryReplyAsync(reply, ct);

        stateMachine.OnCommunicationEstablished();
        Serilog.Log.Information("[STATE] Comm established → ONLINE_REMOTE (auto)");
    }
}
