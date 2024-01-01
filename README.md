# Google Maps Scraper

## Prerequisites

Ensure you have the following dependencies installed before running the script:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (Node Package Manager)

## Installation

1. Clone this repository:

    ```bash
    git clone https://github.com/your-username/your-repo.git
    cd your-repo
    ```

2. Install the required npm packages:

    ```bash
    npm install
    ```

## Usage

1. Open the `scraper.js` file and update the `query` variable with your desired search query:

    ```javascript
    const query = "Laundry di Jakarta";
    ```

2. Run the script:

    ```bash
    node index.js
    ```

    The script will launch a headless browser, perform the Google Maps search, and scrape relevant business information.

3. The scraped data will be saved in a CSV file named `places.csv` in the project directory.

## Acknowledgments

This script is based on [@adrianhorning08](https://gist.github.com/adrianhorning08/dd72c19670b488ac5b42ec292a6d158a). Special thanks for providing the initial code.
