using Secs4Net;
using SecsGemDemo.Domain.Catalogs;
using SecsGemDemo.Equipment.Services;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Handlers;

public sealed class S2F41Handler(RecipeStore recipeStore, GemStateMachine stateMachine)
{
    public async Task HandleAsync(PrimaryMessageWrapper e, CancellationToken ct)
    {
        var msg  = e.PrimaryMessage;
        var root = msg.SecsItem;

        // S2F41: L[RCMD, L[L[CPNAME, CPVAL]...]]
        var rcmd = root!.Items[0].GetString();
        Serilog.Log.Information("[HANDLER] S2F41 RCMD={Rcmd}", rcmd);

        byte hcack;

        if (rcmd == HostCommandCatalog.PpSelect)
        {
            var ppid = root.Items[1].Items
                .FirstOrDefault(p => p.Items[0].GetString() == "PPID")
                ?.Items[1].GetString() ?? "";

            if (recipeStore.TrySelect(ppid))
            {
                hcack = 0x00;   // ACK
                // Idle → Setup → Ready
                stateMachine.StartSetup();
                await Task.Delay(200, ct);
                stateMachine.CompleteSetup();
                Serilog.Log.Information("[HANDLER] S2F41 PP-SELECT {Ppid} → Ready", ppid);
            }
            else
            {
                hcack = 0x02;   // PPID unknown
                Serilog.Log.Warning("[HANDLER] S2F41 PP-SELECT unknown PPID={Ppid}", ppid);
            }
        }
        else
        {
            hcack = 0x01;   // Unknown RCMD
        }

        var reply = new SecsMessage(2, 42, replyExpected: false)
        {
            Name = "Host Command Send Ack",
            SecsItem = L(B(hcack), L())
        };
        await e.TryReplyAsync(reply, ct);
    }
}
