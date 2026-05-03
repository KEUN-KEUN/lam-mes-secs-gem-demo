namespace SecsGemDemo.Host.Api.Dtos;

public record TraceDataDto(
    string Temp,
    string GasFlow,
    string Pressure,
    string Timestamp);
