namespace SecsGemDemo.Host.Api.Dtos;

public record SecsMessageDto(
    string Direction,
    int S,
    int F,
    string Name,
    string Sml,
    string Timestamp);
