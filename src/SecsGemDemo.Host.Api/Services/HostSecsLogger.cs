using Secs4Net;
using Serilog;

namespace SecsGemDemo.Host.Api.Services;

public sealed class HostSecsLogger : ISecsGemLogger
{
    public void MessageIn(SecsMessage msg, int id)
        => Log.Information("[SECS][E→H] S{S}F{F} id=0x{Id:X8} {Name}", msg.S, msg.F, id, msg.Name ?? "");

    public void MessageOut(SecsMessage msg, int id)
        => Log.Information("[SECS][H→E] S{S}F{F} id=0x{Id:X8} {Name}", msg.S, msg.F, id, msg.Name ?? "");

    public void Info(string msg) => Log.Information("[HSMS] {Msg}", msg);
    public void Warning(string msg) => Log.Warning("[HSMS] {Msg}", msg);
    public void Error(string msg) => Log.Error("[HSMS] {Msg}", msg);
    public void Error(string msg, SecsMessage? secsMsg, Exception? ex) => Log.Error(ex, "[HSMS] {Msg}", msg);
    public void Debug(string msg) => Log.Debug("[HSMS] {Msg}", msg);
}
