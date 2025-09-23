import pandas as pd

lex_ref = pd.read_csv('lex_ref_link.csv', dtype='string')
lex_ref = lex_ref[ ["orig_lang_abbrev", "form_in_ref", "gloss_orig"] ].dropna() 

def get_cross_rows(df1, df2):
	cols = df2.columns.tolist()
	df2 = df2.reset_index()
	df1 = df1.reset_index().merge(
		df2, 
		how='left', 
		on=cols, 
		suffixes=('', '_2')
		)
	df1.set_index("index")
	return list(df1["index_2"])

unique = lex_ref.drop_duplicates()
unique_wordonly = lex_ref[["orig_lang_abbrev", "form_in_ref"]].drop_duplicates()
lex_ref['word_id'] = get_cross_rows(lex_ref, unique)
lex_ref['word_id_maybe'] = get_cross_rows(lex_ref, unique_wordonly)
id_differs = lex_ref.loc[lex_ref['word_id'] != lex_ref['word_id_maybe']]
check_these = lex_ref.loc[lex_ref['word_id_maybe'].isin(id_differs['word_id_maybe'])]
check_these = check_these.sort_values('word_id_maybe')

check_these.to_csv("out.csv", encoding='utf-8-sig')