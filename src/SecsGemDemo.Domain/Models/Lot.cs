namespace SecsGemDemo.Domain.Models;

public record Lot(
    string LotId,
    string CurrentStep,
    int WaferCount,
    string? TrackInTime = null,
    string? TrackOutTime = null,
    string? Result = null
);