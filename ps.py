import sys
from time import sleep
from pprint import pprint as pp
from PIL import Image, ImageGrab
from time import sleep
import click
click.disable_unicode_literals_warning = True

def print_screen(fname, itype="JPEG"):
    img = ImageGrab.grab()
    img.save(fname, itype, quality=100, subsampling=0)

@click.command()
@click.option('-f', '--file_name', default='snap', help='File prefix.', required=True)
def start_loop(**kwargs):
    fn = kwargs.get('file_name')
    assert fn
    for i in range(10):
        sleep(1)
        imgfn = '%s_%03d.jpg' % (fn, i)
        print_screen(imgfn)
        print('Screenshot %d is saved to "%s"' % (i, imgfn))

if __name__ == "__main__":
    start_loop()
