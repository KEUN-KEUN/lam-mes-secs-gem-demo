using Secs4Net;
using Serilog;

namespace SecsGemDemo.Equipment.Services;

public sealed class EquipmentSecsLogger : ISecsGemLogger
{
    public void MessageIn(SecsMessage msg, int id)
        => Log.Information("[SECS][H→E] {S}F{F} id=0x{Id:X8} {Name}", msg.S, msg.F, id, msg.Name ?? "");

    public void MessageOut(SecsMessage msg, int id)
        => Log.Information("[SECS][E→H] {S}F{F} id=0x{Id:X8} {Name}", msg.S, msg.F, id, msg.Name ?? "");

    public void Info(string msg) => Log.Information("[HSMS] {Msg}", msg);
    public void Warning(string msg) => Log.Warning("[HSMS] {Msg}", msg);
    public void Error(string msg) => Log.Error("[HSMS] {Msg}", msg);
    public void Error(string msg, SecsMessage? secsMsg, Exception? ex) => Log.Error(ex, "[HSMS] {Msg}", msg);
    public void Debug(string msg) => Log.Debug("[HSMS] {Msg}", msg);
}
