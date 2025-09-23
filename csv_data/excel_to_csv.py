import pandas as pd
import sys
import os

if len(sys.argv) > 1:
	if "*" in sys.argv:
		files = [f.replace('.xlsx','') for f in os.listdir() if f.endswith('.xlsx')]
	else:
		files = sys.argv[1:]
else :
	files = ['lex_master', 'rt_master', 'rt_ref_link', 'lex_ref_link']

for fname in files:
	print("Working on", fname)
	df = pd.read_excel(fname + '.xlsx', dtype='string')
	df.to_csv(fname + '.csv', encoding='utf-8-sig', index=False)