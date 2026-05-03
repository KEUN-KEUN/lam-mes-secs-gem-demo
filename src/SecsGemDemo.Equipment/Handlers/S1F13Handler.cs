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

        // 이중 Connect 방지: 이미 Communicating 상태면 상태 전이 생략
        if (stateMachine.CommState != SecsGemDemo.Domain.Enums.CommState.Communicating)
        {
            stateMachine.OnCommunicationEstablished();
            Serilog.Log.Information("[STATE] Comm established → ONLINE_REMOTE");
        }
        else
        {
            Serilog.Log.Warning("[HANDLER] S1F13 received but already Communicating — state unchanged");
        }
    }
}
