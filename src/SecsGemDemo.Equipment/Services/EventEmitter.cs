using Secs4Net;
using SecsGemDemo.Domain.Catalogs;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Services;

public sealed class EventEmitter(ReportRegistry registry, ISecsGem secsGem)
{
    private uint _dataIdCounter = 1;

    public async Task EmitAsync(uint ceid, Dictionary<uint, string> dvValues, CancellationToken ct = default)
    {
        if (!registry.IsCeidEnabled(ceid))
        {
            Serilog.Log.Warning("[EVENT] CEID={Ceid} not enabled, skipping", ceid);
            return;
        }

        var rptIds = registry.GetRptIdsForCeid(ceid);
        var reportList = new List<Item>();

        foreach (var rptId in rptIds)
        {
            var def = registry.GetReport(rptId);
            if (def is null) continue;

            var varItems = def.Dvids
                .Select(dvid => dvValues.TryGetValue(dvid, out var val) ? A(val) : A(""))
                .Cast<Item>()
                .ToList();

            reportList.Add(L(U4(rptId), L(varItems)));
        }

        var s6f11 = new SecsMessage(6, 11, replyExpected: true)
        {
            Name = "Event Report Send",
            SecsItem = L(
                U4(_dataIdCounter++),
                U4(ceid),
                L(reportList)
            )
        };

        Serilog.Log.Information("[SECS][E→H] S6F11 W CEID={Ceid} RPTIDs=[{RptIds}]",
            ceid, string.Join(",", rptIds));

        await secsGem.SendAsync(s6f11, ct);
    }
}
