using SecsGemDemo.Domain.Enums;
using Stateless;

namespace SecsGemDemo.Equipment.Services;

public sealed class GemStateMachine
{
    private enum CommTrigger { CommunicationEstablished, Disconnected }
    private enum ProcessTrigger { StartSetup, SetupComplete, ProcessBegin, ProcessComplete, AlarmRaised, AlarmCleared }

    private readonly StateMachine<CommState, CommTrigger> _commSm;
    private readonly StateMachine<ProcessState, ProcessTrigger> _processSm;

    public CommState CommState => _commSm.State;
    public ProcessState ProcessState => _processSm.State;

    public event Action<CommState>? CommStateChanged;
    public event Action<ProcessState>? ProcessStateChanged;

    public GemStateMachine()
    {
        _commSm = new StateMachine<CommState, CommTrigger>(CommState.NotCommunicating);

        _commSm.Configure(CommState.NotCommunicating)
            .Permit(CommTrigger.CommunicationEstablished, CommState.Communicating);

        _commSm.Configure(CommState.Communicating)
            .Permit(CommTrigger.Disconnected, CommState.NotCommunicating);

        _commSm.OnTransitioned(t =>
        {
            Serilog.Log.Information("[STATE] Comm: {From} → {To}", t.Source, t.Destination);
            CommStateChanged?.Invoke(t.Destination);
        });

        _processSm = new StateMachine<ProcessState, ProcessTrigger>(ProcessState.Idle);

        _processSm.Configure(ProcessState.Idle)
            .Permit(ProcessTrigger.StartSetup, ProcessState.Setup);

        _processSm.Configure(ProcessState.Setup)
            .Permit(ProcessTrigger.SetupComplete, ProcessState.Ready)
            .PermitReentry(ProcessTrigger.StartSetup);

        _processSm.Configure(ProcessState.Ready)
            .Permit(ProcessTrigger.ProcessBegin, ProcessState.Executing)
            .Permit(ProcessTrigger.StartSetup,   ProcessState.Setup);

        _processSm.Configure(ProcessState.Executing)
            .Permit(ProcessTrigger.ProcessComplete, ProcessState.Idle)
            .Permit(ProcessTrigger.AlarmRaised,     ProcessState.Pause)
            .Permit(ProcessTrigger.StartSetup,      ProcessState.Setup);

        _processSm.Configure(ProcessState.Pause)
            .Permit(ProcessTrigger.AlarmCleared, ProcessState.Executing)
            .Permit(ProcessTrigger.StartSetup,   ProcessState.Setup);

        _processSm.OnTransitioned(t =>
        {
            Serilog.Log.Information("[STATE] Process: {From} → {To}", t.Source, t.Destination);
            ProcessStateChanged?.Invoke(t.Destination);
        });
    }

    public void OnCommunicationEstablished() => _commSm.Fire(CommTrigger.CommunicationEstablished);
    public void OnDisconnected() => _commSm.Fire(CommTrigger.Disconnected);

    public void StartSetup() => _processSm.Fire(ProcessTrigger.StartSetup);
    public void CompleteSetup() => _processSm.Fire(ProcessTrigger.SetupComplete);
    public void BeginProcess() => _processSm.Fire(ProcessTrigger.ProcessBegin);
    public void CompleteProcess() => _processSm.Fire(ProcessTrigger.ProcessComplete);
    public void RaiseAlarm() => _processSm.Fire(ProcessTrigger.AlarmRaised);
    public void ClearAlarm() => _processSm.Fire(ProcessTrigger.AlarmCleared);
}
