import pandas as pd
import pyodbc

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

table_name = 'movies'
csv_file_path = "moviedata2.csv"
# movies = pd.read_csv("moviedata2.csv")
movies = pd.read_csv(csv_file_path)

# create_table = f'''
# CREATE TABLE {table_name} (
#     Series_Title NVARCHAR(MAX),
#     Released_Year INT,
#     Certificate NVARCHAR(50),
#     Runtime NVARCHAR(50),
#     Genre NVARCHAR(255),
#     IMDB_Rating FLOAT,
#     Meta_score INT,
#     Director NVARCHAR(255),
#     Star1 NVARCHAR(255),
#     Star2 NVARCHAR(255),
#     Star3 NVARCHAR(255),
#     Star4 NVARCHAR(255),
#     No_of_Votes INT,
#     Gross NVARCHAR(255)
# );
# '''
# cursor.execute(create_table)
# conn.commit()




def is_integer(value):
    try:
        int(value)
        return True
    except ValueError:
        return False

movies = movies[movies['Released_Year'].apply(is_integer)]
movies['Released_Year'] = pd.to_numeric(movies['Released_Year'])

#INSERT INTO TABLE
for index, row in movies.iterrows():
    insert_query = f'''
    INSERT INTO {table_name} (
        Series_Title, Released_Year, Certificate, Runtime, Genre,
        IMDB_Rating, Meta_score, Director, Star1, Star2, Star3, Star4,
        No_of_Votes, Gross
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    '''
    cursor.execute(insert_query, tuple(row))

conn.commit()

cursor.close()
conn.close()


print(movies.dtypes)

