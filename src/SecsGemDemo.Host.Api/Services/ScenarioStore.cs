using System.Text.Json;
using SecsGemDemo.Host.Api.Models;

namespace SecsGemDemo.Host.Api.Services;

public sealed class ScenarioStore
{
    private readonly List<ScenarioDefinition> _definitions;
    private readonly List<ScenarioRunResult>  _results = [];

    public ScenarioStore(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "scenarios.json");
        var json = File.Exists(path) ? File.ReadAllText(path) : "[]";
        _definitions = JsonSerializer.Deserialize<List<ScenarioDefinition>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
    }

    public IReadOnlyList<ScenarioDefinition> Definitions => _definitions;

    public ScenarioDefinition? Get(string id) =>
        _definitions.FirstOrDefault(d => d.Id == id);

    public ScenarioRunResult StartRun(ScenarioDefinition def)
    {
        var run = new ScenarioRunResult
        {
            ScenarioId   = def.Id,
            ScenarioName = def.Name,
            LotId        = def.LotId,
            Ppid         = def.Ppid,
            WaferCount   = def.WaferCount
        };
        _results.Add(run);
        return run;
    }

    public void CompleteRun(ScenarioRunResult run, string result)
    {
        run.EndTime = DateTime.UtcNow.ToString("o");
        run.Result  = result;
    }

    public IReadOnlyList<ScenarioRunResult> Results => _results;
}
