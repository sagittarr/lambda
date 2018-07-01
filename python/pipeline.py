import pandas as pd
import numpy as np
df = pd.read_csv('SHARADAR-SF1.csv')


def compute_growth(group, column):
    group[column+"_growth"] = np.nan
    for i in group.index.get_values()[1:]:
        group.loc[i, column+'_growth'] = group.loc[i, column]/group.loc[i-1, column]
    return group


def apply_assests_filter(group):
    group = compute_growth(group, 'assets')
    return (group['assets_growth'].dropna() > 1.2).all() and len(group) >= 6


def apply_eps_filter(group):
    group = compute_growth(group, 'eps')
    return (group['eps_growth'].dropna() > 1.2).all() and len(group) >= 6


def apply_roa_filter(group):
    # growth = compute_growth(group, 'roa')
    df = group['roa'].dropna()
    return (df > 0.0).all() and len(df) >= 5

def apply_roa_grw_filter(group):
    growth = compute_growth(group, 'roa')
    return (growth['roa_growth'].dropna() > 1.0).all() and len(growth) >= 6 and apply_roa_filter(group)


def apply_numerical_filter(group, column, threshold, N, date):
    # growth = compute_growth(group, 'roa')
    df = group[group['calendardate'] == date]
    df = df[column].dropna()
    return (not df.empty) and (df > threshold).all()    # print(group['calendardate'], df)


def apply_numerical_growth_filter(group, column, threshold, N):
    growth = compute_growth(group, column)
    df = growth[column+'_growth'].dropna()
    return (df > threshold).all() and len(df) >= N


# series = df.groupby('ticker').apply((lambda x: apply_numerical_growth_filter(x, 'revenue', 1.2, 6)))
series = df.groupby('ticker').apply((lambda x: apply_numerical_filter(x, 'roe', 1.1, 6, '2017-12-31') & apply_numerical_filter(x, 'assets', 9057000000, 6, '2017-12-31')))
# series2 = df.groupby('ticker').apply((lambda x: apply_numerical_filter(x, 'roe', 1.1, 6, '2016-12-31')))
# series3 = df.groupby('ticker').apply((lambda x: apply_numerical_filter(x, 'roe', 1.1, 6, '2015-12-31')))
df = series.to_frame('2017-12-31')
# df['2016-12-31'] = series2
# df['2015-12-31'] = series2

print(df.ix[(df['2017-12-31'] == True) & (df['2016-12-31'] == True) & (df['2015-12-31'] == True)])