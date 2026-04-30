namespace SecsGemDemo.Equipment.Services;

public sealed class RecipeStore
{
    private readonly HashSet<string> _ppids = new(StringComparer.OrdinalIgnoreCase);
    private string? _selectedPpid;

    public void Preload(string ppid) => _ppids.Add(ppid);

    public bool Exists(string ppid) => _ppids.Contains(ppid);

    public bool TrySelect(string ppid)
    {
        if (!_ppids.Contains(ppid)) return false;
        _selectedPpid = ppid;
        return true;
    }

    public string? SelectedPpid => _selectedPpid;
}
