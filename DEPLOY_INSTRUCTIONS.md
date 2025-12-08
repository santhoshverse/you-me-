# Complete Deployment Guide (Step-by-Step)

Since `git` is not currently available in your terminal, we will start from the very beginning. Follow these steps exactly to get your You & Me app online!

## Part 1: Install Git (Required)
1.  Download Git for Windows: [https://git-scm.com/download/win](https://git-scm.com/download/win) (Click "64-bit Git for Windows Setup").
2.  Run the installer. **Keep clicking "Next"** for all options (the defaults are fine).
3.  Once finished, **restart your computer** (or fully close and reopen VS Code) for the command to work.

## Part 2: Upload Code to GitHub
**Do this AFTER installing Git.**

1.  **Create a GitHub Account:** Go to [github.com](https://github.com/) and sign up (if you haven't).
2.  **Create a New Repository:**
    *   Click the **+** icon in the top right -> **New repository**.
    *   Name it `you-and-me-app`.
    *   Select **Public**.
    *   Click **Create repository**.
3.  **Upload your Code:**
    *   Open your VS Code terminal (Control + `).
    *   Make sure you are in the `backend` folder (command: `cd backend`).
    *   Run these commands one by one (copy-paste):
cd
    ```powershell
    # 1. Initialize Git
    git init

    # 2. Create .gitignore (Important!)
    echo node_modules/ > .gitignore

    # 3. Add all files
    git add .

    # 4. Save changes
    git commit -m "Initial deploy"

    # 5. Connect to your new GitHub rep (REPLACE THE URL!)
    # Look at your GitHub page for the link ending in .git
    git remote add origin https://github.com/YOUR_USERNAME/you-and-me-app.git

    # 6. Upload appropriately
    git branch -M main
    git push -u origin main
    ```

## Part 3: Deploy on Render.com (Free)
Now that your code is on GitHub, Render will host it for free.

1.  **Create Account:** Go to [render.com](https://render.com/) and click "GET STARTED". Sign in with **GitHub**.
2.  **New Web Service:**
    *   Click **"New +" button** -> **"Web Service"**.
    *   You should see your `you-and-me-app` repository on the list. Click **"Connect"**.
3.  **Configure Settings:**
    *   **Name:** `you-and-me-party` (or anything unique).
    *   **Region:** Singapore (or whatever is closest to you).
    *   **Branch:** `main`
    *   **Root Directory:** `.` (Leave as is).
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
    *   **Free Instance:** Make sure "Free" is selected.
4.  **Click "Create Web Service"**.

## Part 4: Wait & Enjoy!
*   Render will show a terminal log. Wait for it to say `Server running on port...`.
*   At the top, you will see your **URL** (e.g., `https://you-and-me-party.onrender.com`).
*   **Click that link**. Your app is live!
*   **Share that link** with your friends to start watching together.
