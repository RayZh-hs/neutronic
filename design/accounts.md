# Neutronic Account System

In the updated design, Neutronic does not have a traditional account system. Instead, accounts are locally managed (in the local storage of the client).

- When a level is passed, standard or custom, the user's local account data is updated to reflect the new achievements.
- When a new custom level is created, it is registered under the local account.
- When the user publishes a custom level, it is signed with the local username. (Filled in when first creating a custom level, under prompt "What should we call you?"). We do not verify the uniqueness of usernames either.

Users are free to rename and export and import account data (done so in the account button at the top right corner of the screen). This allows users to share progress across multiple devices, or back up data. The data is stored in JSON format, with no obfuscation. Players can also manually edit the data if they wish to do so.

After an account export, so long as it has not been modified a SAVED flag will be set. When users import an account and the local account has progress but is not SAVED, they will be prompted to either override the local data, or export the local data first before importing.