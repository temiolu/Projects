# import mysql.connector
# from  mysql.connector import Error
import pyodbc
from pyodbc import Error

def create_connection(server, username, password, database, driver):
    connection = None
    conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    try:
        connection = pyodbc.connect(conn_str)
    except Exception as e:
        print(f"The error '{e}' has occured")
    return connection

def execute_query(connection, query, values=None):
    cursor = connection.cursor()
    try:
        if values:
            cursor.execute(query, values)
        else:
            cursor.execute(query)
        connection.commit()
        print("Query executed successfully")
    except Exception as e:
        print(f"The error '{e}' has occurred")
        raise  # Raise the exception to be handled by the caller
    finally:
        cursor.close()  # Close the cursor to release resources



def execute_read_query(connection, query, values=None):
    cursor = connection.cursor()
    result = None
    try:
        if values:
            cursor.execute(query, values)  # Execute query with provided values
        else:
            cursor.execute(query)  # Execute query without values
        rows = cursor.fetchall()
        
        # Convert each Row object to a dictionary
        result = []
        for row in rows:
            row_dict = {}
            for idx, column in enumerate(cursor.description):
                row_dict[column[0]] = row[idx]
            result.append(row_dict)
        
        return result
    except Exception as e:
        print(f"The error '{e}' has occurred")

            