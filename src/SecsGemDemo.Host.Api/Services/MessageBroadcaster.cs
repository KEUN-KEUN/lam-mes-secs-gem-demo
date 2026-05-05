using Microsoft.AspNetCore.SignalR;
using SecsGemDemo.Host.Api.Dtos;
using SecsGemDemo.Host.Api.Hubs;

namespace SecsGemDemo.Host.Api.Services;

public sealed class MessageBroadcaster(IHubContext<SecsHub> hub)
{
    public Task BroadcastMessageAsync(SecsMessageDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("MessageLogged", dto, ct);

    public Task BroadcastStateAsync(GemStateDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("StateChanged", dto, ct);

    public Task BroadcastTraceAsync(TraceDataDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("TraceData", dto, ct);

    public Task BroadcastAlarmAsync(AlarmDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("AlarmOccurred", dto, ct);

    public Task BroadcastLotHistoryAsync(LotHistoryDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("LotHistoryUpdated", dto, ct);

    public Task BroadcastScenarioResultAsync(ScenarioResultDto dto, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("ScenarioCompleted", dto, ct);

    public Task BroadcastScenarioStartedAsync(string scenarioId, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("ScenarioStarted", scenarioId, ct);
}
