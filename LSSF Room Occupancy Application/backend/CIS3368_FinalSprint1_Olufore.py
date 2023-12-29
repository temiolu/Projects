#Temiloluwa Olufore 1970625

import flask
from flask import Flask, request, jsonify, make_response
import creds
from sqlhelper import create_connection, execute_read_query, execute_query #class code functions imported


app = flask.Flask(__name__) #Flask setup
app.json.sort_keys = False


@app.route('/api/login', methods=['GET']) 
def get_hash():
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sql = "SELECT HashesforDecrypt FROM Hashes WHERE idHashes = 1;" #hash stored in db for frontend login
    loginhash = execute_read_query(conn, sql)
    return jsonify(loginhash)


#FLOOR CRUDs
@app.route('/api/floor', methods=['POST']) #creating floors
def add_floor():
    myCreds = creds.Creds()
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    new_floor = request.json
    sqlfloor = "SELECT * FROM floor;"
    floorlevel = execute_read_query(conn, sqlfloor)
    levels = [i['level'] for i in floorlevel]
    names = [i['name'] for i in floorlevel]
    for level in levels:
        if int(level) == int(new_floor["level"]): #chat gpt added int to check for duplicate levels and also the formatting and the error message
            return jsonify({"Message": "This floor level already exists"})
    for name in names:
        if name == new_floor["name"]: 
            return jsonify({"Message": "This floor name already exists"})
    sql = "INSERT INTO floor(level, name) VALUES (%s, %s)"
    values = (new_floor["level"], new_floor["name"])
    floor = execute_query(conn, sql, values)
    levels.append(new_floor["level"]) #Chat GPT updating my levels list with every iteration
    return jsonify(floor) #Jsonify will return data relevant to its table "floor", "room", "resident"

@app.route('/api/floor', methods=['GET']) #views all floors
def view_floor():
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sql = "SELECT level, name FROM floor;" #selecting the variables only (No Id)
    floor = execute_read_query(conn, sql)
    return jsonify(floor)

@app.route('/api/floor/<floorlevel>', methods=['PUT']) #Updating the floor via name and level (done in line with local url)
def update_floor(floorlevel):
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    floor_update = request.json
    sqlfloor = "SELECT * FROM floor;" #Queries so that data is the latest for each request
    floorname = execute_read_query(conn, sqlfloor)
    names = [i['name'] for i in floorname]
    for name in names:
        if name == floor_update["name"]: 
            return jsonify({"Message": "This floor name already exists"})
    sql = "UPDATE floor SET name = %s WHERE level = %s" #updating the name of the floor at level
    values = (floor_update["name"], floorlevel)
    floor = execute_query(conn, sql, values)
    return jsonify({"Message": "Floor name updated successfully"})

@app.route('/api/floor/<level>', methods=['DELETE']) #floor deletion 
def delete_floor(level):
    myCreds = creds.Creds() #class code creds format**
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sqlfloor = "SELECT * FROM floor;"
    floorlevel = execute_read_query(conn, sqlfloor)
    levels = [i['level'] for i in floorlevel]
    sql = "DELETE FROM floor WHERE level = %s" 
    floor = execute_query(conn, sql, (level,)) #chat gpt tuple for the third column as strings can't be passed for deletion
    return jsonify({"Message": "Floor deleted sucessfully"})
#FLOOR CRUDs END




#ROOM CRUDs
@app.route('/api/room', methods=['POST'])
def add_room():
    myCreds = creds.Creds() 
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    new_room = request.json
    sqlroom = "SELECT * FROM room;" #Queries so that data is the latest for each request
    sqlfloor = "SELECT * FROM floor;"
    floorlevel = execute_read_query(conn, sqlfloor)
    roomquery = execute_read_query(conn, sqlroom)
    room_number = [i['number'] for i in roomquery]
    levels = [i['level'] for i in floorlevel]
    negint = None
    if int(new_room["number"]) < 0:
        negint = (new_room["number"][0:2])  # negative room number parsing
    for rooms in room_number:
        if int(rooms) == int(new_room["number"]): #chat gpt added int to check for duplicate levels and also the formatting and the error message
            return jsonify({"Message": "This room number already  exists"})
    if int(new_room["floor"]) in levels and new_room["number"][0] == new_room["floor"]:
        sql = "INSERT INTO room (number, capacity, floor) VALUES (%s, %s, (SELECT id FROM floor WHERE level = %s));"
        values = (new_room["number"], new_room["capacity"], new_room["floor"])
        room = execute_query(conn, sql, values)
        return jsonify(room)
    elif int(new_room["floor"]) in levels and negint == new_room["floor"]:
        sql = "INSERT INTO room (number, capacity, floor) VALUES (%s, %s, (SELECT id FROM floor WHERE level = %s));"
        values = (new_room["number"], new_room["capacity"], new_room["floor"])
        room = execute_query(conn, sql, values)
        return jsonify(room)
    else:
        return jsonify({"Message": "Room number can't be added at this level"})


@app.route('/api/room', methods=['GET']) #views all rooms
def view_room():
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sql = """SELECT ro.number, ro.capacity, f.level as floor
            FROM room ro
            JOIN floor f ON ro.floor = f.id
            GROUP BY ro.number"""
    room = execute_read_query(conn, sql)
    return jsonify(room)


@app.route('/api/room/<roomnumber>', methods=['PUT']) #Updating capacity of rooms
def update_room(roomnumber):
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    room_update = request.json
    sql = "UPDATE room SET capacity = %s WHERE number = %s" 
    values = (room_update["capacity"], roomnumber)
    room = execute_query(conn, sql, values)
    return jsonify({"Message": "Room capacity updated successfully"})
    


@app.route('/api/room/<number>', methods=['DELETE']) #room deletion using parameters
def delete_room(number):
    myCreds = creds.Creds() #class code creds format**
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sqlroom = "SELECT * FROM room;"
    roomquery = execute_read_query(conn, sqlroom)
    room_numbers = [i['number'] for i in roomquery]
    sql3 = """SELECT firstname, lastname
            FROM resident
            WHERE room = (SELECT `id` FROM `room` WHERE `number` = %s);"""
    values = (number,)
    residents = execute_read_query(conn, sql3, (number,)) #Resident checking
    names = [i['lastname'] for i in residents ]
    if len(names) > 0:
        return jsonify({"Message": "Cannot delete currently occupied room."})  #Residents will not be deleted if they are still in room
    else:
        sql = "DELETE FROM room WHERE number = %s" 
        room = execute_query(conn, sql, (number,)) #chat gpt tuple for the third column as strings can't be passed for deletion
        return jsonify({"Message": "Room deleted sucessfully"})    
#ROOM CRUDs END




# RESIDENT CRUDs
@app.route('/api/resident', methods=['POST']) #creating residents 
def add_resident():
    myCreds = creds.Creds() 
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    new_resident = request.json
    sqlcap = "SELECT number, capacity FROM room;"
    capacities = execute_read_query(conn, sqlcap) #capacity checking
    for i in capacities:
        if int(new_resident["room"]) == i['number']:
            roomcap = i
    if len([new_resident["residentID"]][0]) < 3:
        return jsonify({"Message": "Please generate a Resident ID"})
    sql = """INSERT INTO resident(residentID, firstname, lastname, age, room) VALUES (%s, %s, %s, %s, (SELECT `id` FROM `room` WHERE `number` = %s));""" #select the room number that will automatically match the foreign keys
    values = (new_resident["residentID"], new_resident["firstname"], new_resident["lastname"], new_resident["age"], new_resident["room"])
    resident = execute_query(conn, sql, values)
    sqlroom = """UPDATE room
                SET capacity = capacity - 1
                WHERE number = %s"""
    values2 = (new_resident["room"],)
    room_num_cap = execute_query(conn, sqlroom, values2)
    return jsonify(resident)


@app.route('/api/resident', methods=['GET']) #views all residents
def view_resident():
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName) 
    sql = """SELECT r.residentID, r.firstname, r.lastname, r.age, ro.number as `room` 
            FROM resident r
            JOIN room ro ON r.room = ro.id
            GROUP BY r.firstname, r.lastname
            ORDER BY r.lastname ASC;"""
    resident = execute_read_query(conn, sql)
    return jsonify(resident)



@app.route('/api/resident/<residentID>', methods=['PUT']) 
def update_resident(residentID):
    myCreds = creds.Creds()  
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    resident_update = request.json
    sqlroom = """UPDATE room
                SET capacity = capacity + 1
                WHERE id = (SELECT room from resident WHERE residentID = %s)""" #Adding capacity back to the room being vacated (will be done in PUT POST and DELETES in relevan)
    values2 = (residentID,)
    room_num_cap2 = execute_query(conn, sqlroom, values2)
    sql = """UPDATE resident
            SET room = (SELECT `id` FROM `room` WHERE `number` = %s)
            WHERE residentID = %s AND room = (SELECT `room` FROM (SELECT * FROM `resident`) AS temp 
            WHERE residentID = %s);"""
    values = (resident_update["room"], residentID, residentID) #resident_update["firstname"], resident_update["lastname"])
    resident = execute_query(conn, sql, values)
    sqlroom2 = """UPDATE room
                SET capacity = capacity - 1
                WHERE number = %s""" # New room assingment capacity reduction
    values3 = (resident_update["room"],)
    room_num_cap = execute_query(conn, sqlroom2, values3)
    return jsonify({"Message": "Resident moved successfully"})  

@app.route('/api/resident/<residentID>', methods=['DELETE']) #resident deletion
def delete_resident(residentID):
    myCreds = creds.Creds() #class code creds format**
    conn = create_connection(myCreds.conString, myCreds.userName, myCreds.password, myCreds.dbName)
    sql = "DELETE FROM resident WHERE residentID = %s;" 
    sqlroom = """UPDATE room
                SET capacity = capacity + 1
                WHERE id = (SELECT r.room
                FROM resident r
                WHERE r.residentID = %s);"""
    values2 = (residentID,)
    room_num_cap = execute_query(conn, sqlroom, values2) #updating capacity after deletion
    resident = execute_query(conn, sql, (residentID,)) #chat gpt tuple for the third column as strings can't be passed for deletion
    return jsonify({"Message": "Resident deleted successfully"})
#RESIDENT CRUDs END



if __name__ == '__main__':
    app.run(debug = True)

#sources: StackOverflow, CHATGPT, Classroom Code, GeeksforGeeks
