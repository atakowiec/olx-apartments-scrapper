# Apartments Crawler App

This is a simple web crawler that automatically fetches all the apartments from search results on the olx website, stores them in a database and displays them in accesible way on a website.

I am still working on this project, so it is not finished yet.

I will implement the following features:
- `Accept` and `Reject` buttons for each apartment. Those buttons will allow the user to accept or reject the apartment. Those buttons will mark apartments as accepted or rejected in the database.
- List of accepted apartments.


Basically the app will allow the user to filter out the apartments that he is not interested in and keep the ones that he is interested in.

On OLX website this is more difficult to do, because the search results can be duplicated, loading of single apartment's page can be slow and the website can be unresponsive. This app will make this process easier and faster.

## Tech Stack
- Next.js - for the frontend and backend
- Prisma and SQLite - for the database
- Puppeteer - for web scraping
- Tailwind CSS - for styling