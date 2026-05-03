namespace SecsGemDemo.Host.Api.Services;

public sealed class GemStateTracker
{
    private static readonly HashSet<string> ValidCommStates =
        ["Communicating", "NotCommunicating"];

    private static readonly HashSet<string> ValidProcessStates =
        ["Idle", "Setup", "Ready", "Executing", "Pause"];

    public string CommState    { get; private set; } = "NotCommunicating";
    public string ProcessState { get; private set; } = "Idle";

    public void SetComm(string state)
    {
        if (!ValidCommStates.Contains(state))
            Serilog.Log.Warning("[STATE] Unknown CommState: {State}", state);
        CommState = state;
    }

    public void SetProcess(string state)
    {
        if (!ValidProcessStates.Contains(state))
            Serilog.Log.Warning("[STATE] Unknown ProcessState: {State}", state);
        ProcessState = state;
    }
}
