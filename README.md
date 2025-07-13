# Reading Duplicate or similar based on threshold

The open source metadata reader I found was 

https://pypi.org/project/exif/

The idea is if the threshold is reached, then every other duplicate photo that is within the threshhold besides the base photo to be deleted.

# High Level Design 
The workflow of the project is as followed

# Work in progress
Currently working on
* Utilizing restful API to integrate with apple photos and google photos. Specifically with FastAPI
* create seperate .py files for instances of google photos and apple photos
* research other open source API's to see instances of faster retrival of metadata to cut down on computational costs
* figuring out the base threshold that the perception can use for the "similarity score"
