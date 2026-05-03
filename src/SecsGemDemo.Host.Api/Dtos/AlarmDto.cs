namespace SecsGemDemo.Host.Api.Dtos;

public record AlarmDto(
    uint   AlarmId,
    string AlarmText,
    bool   IsSet,
    string Timestamp);
