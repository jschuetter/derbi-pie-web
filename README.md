# derbi-pie-web
This is the frontend code for DERBi PIE: a Database of Etymological Roots Beginning in Proto-Indo-European. 

To serve the webpage, run `node bin/www`, or use `npm run start` to start the [`nodemon`](https://www.npmjs.com/package/nodemon) and automatically restart the app when files are changed. The webpage can then be accessed at `localhost:3000` in your web browser.
> [!TIP]
> If the MySQL service is not running on your computer, the website will not start. Factory default settings start this service when your machine powers on, but you may have disabled this when you installed MySQL. To start it (on Windows), enter `services.msc` in your Run prompt (Win+R) and find the `MySQL80` service. Select it, and click 'Start'.

## Repository Structure
`core/app.js` contains the primary definitions of the app's structure. All routes are imported here and assigned to front-facing endpoints. 
> [!TIP]
> To bypass user authentication for development, uncomment lines 99-101 in `app.js` (enables traffic from locahost to access the site unauthenticated. )

The MySQL connection is configured in `mysqlConnection.js`. 
> [!CAUTION]
> Once put into production, the database username and password should **NOT** be stored in the source code. A common practice is to pass them in using environment variables.

### Pages
#### Routes
*`/core/routes/`*

Routes define the page-loading logic for the database. Each valid URL path corresponds to a specific route. Generally, route files correspond to a view file of the same name. However, there are a few routes without names. They are listed here: 

- `auth.js`: this route file handles all authentication logic. As such, it may render a number of different view files (e.g. `login` and `register`). 
- `/download` (`download.js`): an endpoint that enables exporting database data as a .csv file. 
- `index.js`: the default route; redirects to the search page. 
- `/tokens` (`token.js`): a MySQL API that returns a JSON file containing the grammatical parsing data for the token with the given `corpus_master_id` and `doc_token_id`. 

#### Views
*`/core/views`*

Views are the templates that are *rendered* when a particular page is loaded. These are called using a `res.render()` command in a route script. For this project, page templates are declared using [PUG templates](https://pugjs.org/api/getting-started.html), a streamlined version of HTML. I found [this tutorial](https://www.youtube.com/watch?v=_kOWcRur7f0&list=PLz_6dB4PItBEYHIDnXPUI81pTQ_71eEqS&index=1) to be very helpful.

---

#### Pages
There are many pages. The important ones are listed here. Pages generally correspond to the route file of the same name. New pages must have a route defined and then included in `app.js` in order to be accessible.
- about
- corpus: access to all corpus documents
- error: page that loads when you can't find the right one.
- footer: template for the footer (consistent across all pages)
- latin: Latin lexicon page
- layout: overall page template, including header navbar. Includes blocks for content (used by other templates) and footer template.
- login
- register
- results
- search