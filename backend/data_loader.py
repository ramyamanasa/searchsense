import pandas as pd
import numpy as np
import os

def load_criteo_sample(path="data/dac/train.txt", n_rows=500000):
    print("Loading Criteo data...")
    
    col_names = ["click"] + [f"num_{i}" for i in range(13)] + [f"cat_{i}" for i in range(26)]
    
    df = pd.read_csv(
        path,
        sep="\t",
        header=None,
        names=col_names,
        nrows=n_rows
    )
    
    print(f"Loaded {len(df)} rows")
    print(f"Click rate: {df['click'].mean():.3f}")
    print(f"\nShape: {df.shape}")
    print(f"\nFirst few rows:\n{df.head()}")
    
    return df

if __name__ == "__main__":
    load_criteo_sample()