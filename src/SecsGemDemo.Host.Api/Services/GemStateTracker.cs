namespace SecsGemDemo.Host.Api.Services;

public sealed class GemStateTracker
{
    public string CommState    { get; private set; } = "NotCommunicating";
    public string ProcessState { get; private set; } = "Idle";

    public void SetComm(string state)    => CommState    = state;
    public void SetProcess(string state) => ProcessState = state;
}
