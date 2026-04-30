namespace SecsGemDemo.Host.Api.Services;

public sealed class ValidationEngine(MasterDataStore masterData)
{
    public (bool ok, string message) ValidateCarrierArrived(string lotId)
    {
        if (masterData.Lot.LotId != lotId)
            return (false, $"LOT {lotId} not found");

        if (masterData.Lot.CurrentStep != "PHOTO-LITHO")
            return (false, $"LOT {lotId} current step is {masterData.Lot.CurrentStep}, expected PHOTO-LITHO");

        return (true, $"LOT {lotId} validated OK");
    }

    public (bool ok, string message) ValidateRecipe(string ppid)
    {
        if (masterData.Recipe.Ppid != ppid)
            return (false, $"Recipe {ppid} not registered in MES");

        return (true, $"Recipe {ppid} validated OK");
    }
}
