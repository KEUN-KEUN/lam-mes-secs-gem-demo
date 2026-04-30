using SecsGemDemo.Domain.Catalogs;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Services;

public record ReportDefinition(uint RptId, List<uint> Dvids);

public sealed class ReportRegistry
{
    private readonly Dictionary<uint, ReportDefinition> _reports = new();
    private readonly Dictionary<uint, List<uint>> _ceidToRptIds = new();

    public void DefineReport(uint rptId, List<uint> dvids)
    {
        _reports[rptId] = new ReportDefinition(rptId, dvids);
        Serilog.Log.Information("[REPORT] Defined RPTID={RptId} DVIDs=[{Dvids}]",
            rptId, string.Join(",", dvids));
    }

    public void LinkEvent(uint ceid, List<uint> rptIds)
    {
        _ceidToRptIds[ceid] = rptIds;
        Serilog.Log.Information("[REPORT] Linked CEID={Ceid} → RPTIDs=[{RptIds}]",
            ceid, string.Join(",", rptIds));
    }

    public void ClearAllReports()
    {
        _reports.Clear();
        _ceidToRptIds.Clear();
    }

    public List<uint> GetRptIdsForCeid(uint ceid)
        => _ceidToRptIds.TryGetValue(ceid, out var ids) ? ids : [];

    public ReportDefinition? GetReport(uint rptId)
        => _reports.TryGetValue(rptId, out var def) ? def : null;

    private readonly HashSet<uint> _enabledCeids = new();

    public void EnableCeids(List<uint> ceids, bool enable)
    {
        if (enable)
            foreach (var c in ceids) _enabledCeids.Add(c);
        else
            foreach (var c in ceids) _enabledCeids.Remove(c);
    }

    public bool IsCeidEnabled(uint ceid) => _enabledCeids.Contains(ceid);
}
