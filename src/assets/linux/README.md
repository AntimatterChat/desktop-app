# Antimatter Desktop for Linux

## Table of Contents

- [Install](#install)
- [User Guide](#user-guide)
- [Contributing](#contributing)
- [License](#license)


## Install

If you installed the application with a package manager, it's ready to use. See the [User Guide](#user-guide) below.

Otherwise, extract the archive in a directory of your choice (e.g. `/opt/antimatter-desktop`, which also contains this
README) and follow the steps below.

### Desktop launcher

Run the script to create a `chat.antimatter.desktop.desktop` file:

```
/opt/antimatter-desktop/create_desktop_file.sh
```

Then move it to your desktop environment's applications directory, for example `~/.local/share/applications/` for
the current user:

```
mv chat.antimatter.desktop.desktop ~/.local/share/applications/
```

The launcher also registers the app for `antimatter://` links (and for `mattermost://` links).

### Terminal command

To launch the app from a terminal, add its directory to your `PATH`, for example in `~/.bashrc`:

```sh
# assuming that /opt/antimatter-desktop/chat.antimatter.desktop is the executable file
export PATH=$PATH:/opt/antimatter-desktop
```

Or create a symbolic link to it:

```sh
sudo ln -s /opt/antimatter-desktop/chat.antimatter.desktop /usr/local/bin/antimatter-desktop
```


## User Guide

On the first launch, enter the URL of your Antimatter server (beginning with `http://` or `https://`) and a name for
it, then select **Connect**. You can add other servers later from the server dropdown or from **Settings**.

More help is available at [antimatter.chat/help.html](https://antimatter.chat/help.html).


## Contributing

See the [contributing guidelines](https://github.com/AntimatterChat/desktop-app/blob/main/CONTRIBUTING.md) to report
bugs, suggest features or submit pull requests.


## License

Apache License, Version 2.0
