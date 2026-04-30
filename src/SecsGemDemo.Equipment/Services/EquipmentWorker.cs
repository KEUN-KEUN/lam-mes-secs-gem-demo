using Microsoft.Extensions.Hosting;
using Secs4Net;

namespace SecsGemDemo.Equipment.Services;

public sealed class EquipmentWorker(
    ISecsConnection hsmsConnection,
    ISecsGem secsGem,
    GemStateMachine stateMachine,
    MessageRouter router) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        hsmsConnection.ConnectionChanged += (_, state) =>
        {
            Serilog.Log.Information("[HSMS] ConnectionState → {State}", state);
            // Communicating 상태일 때만 disconnect 처리 (NotCommunicating에서는 무시)
            if ((state == ConnectionState.Retry || state == ConnectionState.Connecting)
                && stateMachine.CommState == SecsGemDemo.Domain.Enums.CommState.Communicating)
                stateMachine.OnDisconnected();
        };

        hsmsConnection.Start(stoppingToken);

        Serilog.Log.Information("[EQUIPMENT] Listening on HSMS Passive — waiting for Host connection");

        await foreach (var e in secsGem.GetPrimaryMessageAsync(stoppingToken))
        {
            using var msg = e.PrimaryMessage;
            try
            {
                await router.RouteAsync(e, stoppingToken);
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "[EQUIPMENT] Error handling S{S}F{F}", msg.S, msg.F);
            }
        }
    }
}
