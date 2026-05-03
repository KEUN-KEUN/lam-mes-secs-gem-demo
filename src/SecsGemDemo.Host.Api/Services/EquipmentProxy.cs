namespace SecsGemDemo.Host.Api.Services;

public sealed class EquipmentProxy(IHttpClientFactory httpFactory)
{
    public Task CarrierArrivedAsync(string lotId, CancellationToken ct) =>
        PostJsonAsync("carrier-arrived", new { lotId }, ct);

    public Task ProcessStartAsync(string lotId, string ppid, int waferCount, CancellationToken ct) =>
        PostJsonAsync("process-start", new { lotId, ppid, waferCount }, ct);

    public Task ProcessEndAsync(CancellationToken ct) =>
        PostAsync("process-end", ct);

    public Task TraceStartAsync(CancellationToken ct) =>
        PostAsync("trace-start", ct);

    public Task AlarmSetAsync(CancellationToken ct) =>
        PostAsync("alarm-set", ct);

    public Task AlarmClearAsync(CancellationToken ct) =>
        PostAsync("alarm-clear", ct);

    private async Task PostAsync(string path, CancellationToken ct)
    {
        var client = httpFactory.CreateClient("equipment");
        await client.PostAsync($"/equipment/{path}", null, ct);
    }

    private async Task PostJsonAsync(string path, object body, CancellationToken ct)
    {
        var client = httpFactory.CreateClient("equipment");
        await client.PostAsJsonAsync($"/equipment/{path}", body, ct);
    }
}
