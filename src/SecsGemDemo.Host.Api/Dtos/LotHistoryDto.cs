namespace SecsGemDemo.Host.Api.Dtos;

public record LotHistoryDto(
    string  LotId,
    string  Ppid,
    string  StartTime,
    string? EndTime,
    string? Result,
    int     WaferCount);
