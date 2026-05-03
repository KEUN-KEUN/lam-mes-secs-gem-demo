namespace SecsGemDemo.Host.Api.Models;

public record ScenarioDefinition(
    string Id,
    string Name,
    string Description,
    string LotId,
    string Ppid,
    int    WaferCount,
    bool   TriggerAlarm);
