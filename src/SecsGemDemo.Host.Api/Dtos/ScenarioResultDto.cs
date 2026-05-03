namespace SecsGemDemo.Host.Api.Dtos;

public record ScenarioResultDto(
    string  RunId,
    string  ScenarioName,
    string  LotId,
    string  Ppid,
    int     WaferCount,
    string  StartTime,
    string? EndTime,
    string? Result,
    int     AlarmCount,
    double? DurationSeconds);
