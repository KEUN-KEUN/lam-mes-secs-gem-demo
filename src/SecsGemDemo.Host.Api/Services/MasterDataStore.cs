using SecsGemDemo.Domain.Catalogs;
using SecsGemDemo.Domain.Models;

namespace SecsGemDemo.Host.Api.Services;

public sealed class MasterDataStore
{
    public Equipment Equipment { get; } = new("EQP-001", "Photo-Litho Stepper #1");
    public Lot    Lot    { get; private set; } = new("LOT-2026-0430-001", ProcessStepCatalog.PhotoLitho, 25);
    public Recipe Recipe { get; private set; } = new("RCP-PHOTO-A1", "abc123");

    private readonly Dictionary<string, ProcessHistory> _history = new();

    public void ConfigureLot(string lotId, string step, int waferCount) =>
        Lot = new Lot(lotId, step, waferCount);

    public void ConfigureRecipe(string ppid) =>
        Recipe = new Recipe(ppid, $"auto-{ppid.GetHashCode():x}");

    public void RecordTrackIn(string lotId, string ppid, string startTime)
        => _history[lotId] = new ProcessHistory(lotId, ppid, startTime);

    public void RecordTrackOut(string lotId, string endTime, string result)
    {
        if (_history.TryGetValue(lotId, out var h))
            _history[lotId] = h with { EndTime = endTime, Result = result };
    }

    public ProcessHistory? GetHistory(string lotId)
        => _history.TryGetValue(lotId, out var h) ? h : null;

    public IReadOnlyList<ProcessHistory> AllHistory => [.. _history.Values];
}

public record ProcessHistory(
    string LotId,
    string Ppid,
    string StartTime,
    string? EndTime = null,
    string? Result  = null);
