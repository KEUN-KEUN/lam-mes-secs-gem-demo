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
}
