using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Secs4Net;
using System.Diagnostics.CodeAnalysis;

namespace SecsGemDemo.Host.Api.Services;

public static class SecsExtensions
{
    public static IServiceCollection AddSecs4Net<
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)] TLogger>(
        this IServiceCollection services, IConfiguration configuration)
        where TLogger : class, ISecsGemLogger
    {
        services.Configure<SecsGemOptions>(configuration.GetSection("secs4net"));
        services.AddSingleton<ISecsGemLogger, TLogger>();
        services.AddSingleton<ISecsConnection, HsmsConnection>();
        services.AddSingleton<ISecsGem, SecsGem>();
        return services;
    }
}
