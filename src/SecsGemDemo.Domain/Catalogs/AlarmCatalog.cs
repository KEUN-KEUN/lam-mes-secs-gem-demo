namespace SecsGemDemo.Domain.Catalogs;

public static class AlarmCatalog
{
    public const uint   HighTemperature     = 1;
    public const uint   LowPressure         = 2;
    public const uint   ChamberOvertemp     = 101;
    public const string HighTemperatureText = "Chamber temperature exceeds limit";
    public const string LowPressureText     = "Chamber pressure below minimum";
    public const string ChamberOvertempText = "Chamber overtemp";
}
