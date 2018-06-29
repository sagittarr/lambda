import pandas as pd
import numpy as np
df = pd.read_csv('SHARADAR-SF1.csv')


def compute_growth(group):
    group["assets_growth"] = np.nan
    for i in group.index.get_values()[1:]:
        group.loc[i, 'assets_growth'] = group.loc[i, 'assets']/group.loc[i-1, 'assets']
    return group


def apply_filter(group):
    group = compute_growth(group)
    return (group['assets_growth'].dropna() > 1.2).all() and len(group) >= 6


series = df.groupby('ticker').apply(apply_filter)


print(series[series == True])
