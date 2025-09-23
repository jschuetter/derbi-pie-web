import pandas as pd
import sqlalchemy as sql
import sys
import os

# files to process
if len(sys.argv) > 1:
	if "*" in sys.argv:
		files = [f.replace('.csv','') for f in os.listdir() if f.endswith('.csv')]
	else:
		files = sys.argv[1:]
else :
	files = ['lex_master', 'rt_master', 'rt_ref_link', 'lex_ref_link']

# mysql connection. note to self: sqlalchemy is ass find something better
con = sql.create_engine('mysql+pymysql://root:aaa@localhost/derbi-pie').connect()

# reading in from pandas 

indexes = {}
dfs = {}

for fname in files:
	print("Loading ", fname)
	# query sql for table's primary key
	r = pd.read_sql(f'show indexes from {fname} where Key_name="PRIMARY" ',con)
	indexes[fname] = r["Column_name"].to_list()[0]

	df = pd.read_csv(fname + '.csv', dtype='string')
	
	# enforcing data type for last_updated
	if 'last_updated' in df.keys():
		# strftime because syntax in the files is weird
		dates = pd.to_datetime(df['last_updated'], format='%Y_%m_%d_%H%M', errors='coerce')
		df['last_updated'] = dates

	# get columns for sql so we can check if we need to add any
	# i wish i didn't have to do this but whatevs
	r = pd.read_sql(f'show columns from {fname} ',con)
	cols_old = set(r["Field"])
	cols_new = set(df.columns)
	cols_add = cols_new - cols_old

	# add columns into the database
	for col in cols_add:
		print('Adding new column', col)
		con.execute(sql.text(f'alter table {fname} add {col} varchar(255)'))

	# enforcing uniqueness and non-nullness 
	col = indexes[fname]
	df[col] = df[col].str.strip()
	val = df[col].drop_duplicates().dropna()
	df = df.iloc[val.index]

	dfs[fname] = df

drop_idxs = {}

# exit()
print("loaded files.\n updating DB....")

for fname in files:
	index = indexes[fname]
	new_data = dfs[fname].set_index(index)
	print("working on", fname)

	# does a stupid little song and dance to make the dtypes string instead of object
	old_data = pd.read_sql(fname,con)
	old_data = old_data.astype("string")
	if "last_updated" in old_data.keys():
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
	add_rows.reset_index().to_sql(fname, con, if_exists='append', index=False, chunksize=1)
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