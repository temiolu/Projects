SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'movies';

SELECT Genre, ROUND(AVG(IMDB_Rating), 2) AS "IMDB Rating"
FROM movies
GROUP BY Genre;


UPDATE movies
SET Genre = SUBSTRING(Genre, 1, CHARINDEX(',', Genre) - 1)
WHERE CHARINDEX(',', Genre) > 0;

SELECT 
    COUNT(*) AS TotalMovies,
    MIN(Released_Year) AS EarliestYear,
    MAX(Released_Year) AS LatestYear,
    AVG(IMDB_Rating) AS AvgRating,
    MIN(IMDB_Rating) AS MinRating,
    MAX(IMDB_Rating) AS MaxRating
FROM Movies;

SELECT * FROM movies
WHERE Released_Year = 2004






SELECT
    Genre,
   ROUND(AVG(IMDB_Rating), 2) AS "IMDB Rating"
FROM Movies
WHERE Released_Year BETWEEN 2000 AND 2019
GROUP BY Genre
ORDER BY Genre;

SELECT * from Movies
WHERE Released_Year BETWEEN 2000 AND 2019

SELECT Genre, FORMAT(SUM(Gross), 'C', 'en-US') AS [Box Office]
FROM movies
-- WHERE Released_Year BETWEEN 2000 AND 2019
GROUP BY Genre
ORDER BY SUM(Gross) DESC;

select * from movies

-- Using Common Table Expressions (CTE) to Unpivot Actor Columns
WITH ActorBoxOffice AS (
    SELECT Actor, Gross
    FROM (
        SELECT Star1 AS Actor, Gross FROM Movies
        UNION ALL
        SELECT Star2 AS Actor, Gross FROM Movies
        UNION ALL
        SELECT Star3 AS Actor, Gross FROM Movies
        UNION ALL
        SELECT Star4 AS Actor, Gross FROM Movies
    ) AS AllActors
)
-- Summing the Box Office for Each Actor
SELECT 
    Actor,
    FORMAT(SUM(Gross), 'C', 'en-US') AS TotalBoxOffice
FROM ActorBoxOffice
GROUP BY Actor
ORDER BY SUM(Gross) DESC;


SELECT Released_Year, FORMAT(SUM(Gross), 'C', 'en-US') AS TotalBoxOffice
FROM movies
GROUP BY Released_Year
ORDER BY SUM(Gross) DESC;

SELECT Series_Title AS "Movie Title", Released_Year
FROM movies
WHERE 'Steven Spielberg' IN (Director) AND Released_Year >= 2000

SELECT TOP 5 Director, FORMAT(SUM(Gross), 'C', 'en-US') AS TotalBoxOffice
FROM movies
GROUP BY Director
HAVING COUNT(*) >= 3
ORDER BY SUM(Gross) DESC

SELECT Genre, AVG(Meta_score) as "Metacritic Score"
FROM movies
GROUP BY Genre
HAVING COUNT(*) >= 5
ORDER BY AVG(Meta_score) DESC;



