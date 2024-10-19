# -*- coding: utf-8 -*-
import typing

from package_manager.impl import *
from .common import DistroType

DISTRO_PM_GENERATOR_DICT = {
    ("archlinux", ""): PacmanCommandGenerator()
}

DISTRO_PACKAGE_NAME_DICT = {
    ("archlinux", ""): {
        "build-essential": "base-devel",
        "coreutils": "coreutils",
        "binutils": "binutils",
        "diffutils": "diffutils",
        "libtool": "libtool",
        "git": "git",
        "bash": "bash",
        "autoconf": "autoconf",
        "automake": "automake",
    }
}


def get_distro_pm_command_generator(distro: DistroType):
    return DISTRO_PM_GENERATOR_DICT.get(distro)


def get_distro_package_name_dict(distro: DistroType) -> typing.Dict[str, str]:
    return DISTRO_PACKAGE_NAME_DICT.get(distro)
