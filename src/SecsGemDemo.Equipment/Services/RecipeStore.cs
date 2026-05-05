namespace SecsGemDemo.Equipment.Services;

public record RecipeProfile(
    double BaseTemp,    double TempAmplitude,  double TempFreq,
    double BaseGas,     double GasAmplitude,   double GasFreq,
    double BasePressure, double PressureAmplitude, double PressureFreq);

public sealed class RecipeStore
{
    private static readonly Dictionary<string, RecipeProfile> Profiles = new()
    {
        ["RCP-PHOTO-A1"] = new(200.0, 10.0, 0.30,  50.0, 5.0, 0.20,  1.00, 0.10, 0.40),
        ["RCP-PHOTO-B2"] = new(120.0,  4.0, 0.55,  30.0, 2.0, 0.45,  0.30, 0.03, 0.60),
    };

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

    public RecipeProfile CurrentProfile =>
        _selectedPpid is not null && Profiles.TryGetValue(_selectedPpid, out var p) ? p : Profiles["RCP-PHOTO-A1"];
}
