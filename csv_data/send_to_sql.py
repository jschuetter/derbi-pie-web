import pandas as pd
import sqlalchemy as sql

# files to process
files = ['lex_master', 'rt_master', 'rt_ref_link', 'lex_ref_link']


# mysql connection. note to self: sqlalchemy is ass find something better
con = sql.create_engine('mysql+pymysql://root:aaa@localhost/derbi-pie').connect()

# read in data from sql 
indexes = {}
for fname in files:
	r = pd.read_sql(f'show indexes from {fname} where  Key_name="PRIMARY" ',con)
	indexes[fname] = r["Column_name"].to_list()[0]

# loads a single file into a dataframe
def load_file(fname):
	df = pd.read_csv(fname + '.csv', dtype='string')
	# strftime because syntax in the files is weird
	dates = pd.to_datetime(df['last_updated'], format='%Y_%m_%d_%H%M')
	df['last_updated'] = dates
	
	# enforcing uniqueness and non-nullness 
	col = indexes[fname]
	val = df[col].drop_duplicates().dropna()
	df = df.iloc[val.index]

	return df

dfs = {fname: load_file(fname) for fname in files}
drop_idxs = {}

print("loaded files.\n updating DB....")

for fname in files:
	index = indexes[fname]
	new_data = dfs[fname].set_index(index)
	print("working on", fname)

	# does a stupid little song and dance to make the dtypes string instead of object
	old_data = pd.read_sql(fname,con)
	old_data = old_data.astype("string")
	old_data["last_updated"] = old_data["last_updated"].astype("datetime64[ns]")
	old_data = old_data.set_index(index)

	# determine which rows need to be added/removed/changed
	old_idxs = set(old_data.index)
	new_idxs = set(new_data.index)
	add_idxs = new_idxs - old_idxs
	drop_idxs[fname] = old_idxs - new_idxs
	keep_idxs = new_idxs & old_idxs

	# insert the new rows
	add_rows = new_data.loc[list(add_idxs)]
	add_rows.to_sql(fname, con, if_exists='append', index=True)
	print("Added", len(add_rows), "entries")

	# finding which rows need to be updated
	keep_idxs = pd.Series(list(keep_idxs))

	# compare each row
	changed = keep_idxs.apply(lambda key:
			not old_data.loc[key].equals(new_data.loc[key])
		)
	changed_idxs = keep_idxs.loc[changed]
	update_rows = new_data.loc[changed_idxs]

	# build sql query as function. maybe the non-pandas way would have been easier?
	def update(table, conn, keys, data_iter):
	    data = [dict(zip(keys, row)) for row in data_iter]
	    for row in data:
	    	con.execute(sql.update(table.table).where(getattr(table.table.c, index) == row[index]).values(row))
	    return len(data)

	update_rows.to_sql(fname, con, if_exists='append', index=True, method=update)

	print("Modified", len(update_rows), "entries")

# delete the removed rows, going backward to prevent deleting a foreign key
for fname in files[::-1]:  
	print("deleting from", fname)
	for idx in drop_idxs[fname]:
		con.execute(sql.text(f'delete from {fname} where {indexes[fname]}="{idx}"'))
	print("Deleted", len(drop_idxs[fname]), "entries")

con.commit()